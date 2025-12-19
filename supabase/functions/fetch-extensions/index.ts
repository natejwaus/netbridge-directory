import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FreePBXExtension {
  extension: string;
  name: string;
  voicemail?: string;
  sipname?: string;
  tech?: string;
  [key: string]: string | undefined;
}

interface ExtensionState {
  extension: string;
  status: string;
  statusText: string;
}

// Map Asterisk status codes to our status types
function mapAsteriskStatus(status: number): { status: string; statusText: string } {
  switch (status) {
    case 0:
      return { status: 'available', statusText: 'Available' };
    case 1:
      return { status: 'incall', statusText: 'On Call' };
    case 2:
      return { status: 'busy', statusText: 'Busy' };
    case 4:
      return { status: 'unavailable', statusText: 'Not Registered' };
    case 8:
      return { status: 'ringing', statusText: 'Ringing' };
    case 9:
      return { status: 'incall', statusText: 'On Call & Ringing' };
    case 16:
      return { status: 'hold', statusText: 'On Hold' };
    case 17:
      return { status: 'hold', statusText: 'On Hold' };
    default:
      if (status < 0) {
        return { status: 'unavailable', statusText: 'Not Registered' };
      }
      return { status: 'unknown', statusText: 'Unknown' };
  }
}

// Connect to AMI and get extension states with timeout
async function getExtensionStates(extensions: string[]): Promise<Map<string, ExtensionState>> {
  const amiHost = Deno.env.get('AMI_HOST');
  const amiPort = parseInt(Deno.env.get('AMI_PORT') || '5038');
  const amiUsername = Deno.env.get('AMI_USERNAME');
  const amiSecret = Deno.env.get('AMI_SECRET');

  const states = new Map<string, ExtensionState>();

  if (!amiHost || !amiUsername || !amiSecret) {
    console.log('AMI credentials not configured, skipping status fetch');
    return states;
  }

  let conn: Deno.TcpConn | null = null;

  try {
    console.log(`Connecting to AMI at ${amiHost}:${amiPort}`);
    
    // Use AbortController for connection timeout (3 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      conn = await Deno.connect({
        hostname: amiHost,
        port: amiPort,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('AMI connection failed (firewall/network issue?):', err);
      return states;
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Read AMI banner with timeout
    const bannerBuffer = new Uint8Array(512);
    const bannerPromise = conn.read(bannerBuffer);
    const bannerTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Banner timeout')), 2000)
    );
    
    try {
      await Promise.race([bannerPromise, bannerTimeout]);
      console.log('AMI Banner received');
    } catch {
      console.error('AMI banner timeout');
      conn.close();
      return states;
    }

    // Helper to send AMI command and read response
    const sendCommand = async (command: string): Promise<string> => {
      const fullCommand = command + "\r\n\r\n";
      await conn!.write(encoder.encode(fullCommand));
      
      let response = '';
      const buffer = new Uint8Array(4096);
      
      // Read until we get a complete response (ends with \r\n\r\n)
      while (true) {
        const n = await conn!.read(buffer);
        if (n === null) break;
        response += decoder.decode(buffer.subarray(0, n));
        if (response.includes('\r\n\r\n')) break;
      }
      
      return response;
    };

    // Login to AMI
    const loginCmd = `Action: Login\r\nUsername: ${amiUsername}\r\nSecret: ${amiSecret}`;
    const loginResponse = await sendCommand(loginCmd);
    
    if (!loginResponse.includes('Success')) {
      console.error('AMI Login failed:', loginResponse);
      return states;
    }
    console.log('AMI Login successful');

    // Get extension states for each extension
    for (const ext of extensions) {
      try {
        // Try ext-local context first (FreePBX default)
        const stateCmd = `Action: ExtensionState\r\nExten: ${ext}\r\nContext: ext-local`;
        const stateResponse = await sendCommand(stateCmd);
        
        // Parse the response for status
        const statusMatch = stateResponse.match(/Status:\s*(-?\d+)/);
        const statusTextMatch = stateResponse.match(/StatusText:\s*(.+?)(?:\r\n|$)/);
        
        if (statusMatch) {
          const statusCode = parseInt(statusMatch[1]);
          const mapped = mapAsteriskStatus(statusCode);
          states.set(ext, {
            extension: ext,
            status: mapped.status,
            statusText: statusTextMatch ? statusTextMatch[1].trim() : mapped.statusText,
          });
          console.log(`Extension ${ext}: status=${statusCode} (${mapped.statusText})`);
        }
      } catch (err) {
        console.error(`Error getting state for extension ${ext}:`, err);
      }
    }

    // Logoff from AMI
    try {
      await sendCommand('Action: Logoff');
    } catch {}
    
    console.log(`Got states for ${states.size}/${extensions.length} extensions`);
    
  } catch (err) {
    console.error('AMI connection error:', err);
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch {}
    }
  }

  return states;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('PBX_CLIENT_ID');
    const clientSecret = Deno.env.get('PBX_CLIENT_SECRET');
    
    const tokenUrl = 'https://pbx.natew.me/admin/api/api/token';
    const gqlUrl = 'https://pbx.natew.me/admin/api/api/gql';

    if (!clientId || !clientSecret) {
      throw new Error('PBX API credentials not configured');
    }

    console.log('Authenticating with FreePBX API...');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'gql',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    console.log('Successfully obtained access token');

    // First introspect coreuser type to see what fields are available
    const introspectUserQuery = `
      query {
        __type(name: "coreuser") {
          fields { name }
        }
      }
    `;

    const introspectResponse = await fetch(gqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: introspectUserQuery }),
    });

    const introspectData = await introspectResponse.json();
    const userFields = introspectData.data?.__type?.fields?.map((f: any) => f.name) || [];
    console.log('coreuser fields:', userFields);

    // Introspect coredevice type too
    const introspectDeviceQuery = `
      query {
        __type(name: "coredevice") {
          fields { name }
        }
      }
    `;

    const introspectDeviceResponse = await fetch(gqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: introspectDeviceQuery }),
    });

    const introspectDeviceData = await introspectDeviceResponse.json();
    const deviceFields = introspectDeviceData.data?.__type?.fields?.map((f: any) => f.name) || [];
    console.log('coredevice fields:', deviceFields);

    // Build user sub-fields
    const wantedUserFields = ['displayname', 'fname', 'lname', 'name', 'extension'];
    const userSubFields = wantedUserFields.filter(f => userFields.includes(f));
    if (userSubFields.length === 0 && userFields.length > 0) {
      userSubFields.push(userFields[0]);
    }

    // Build device sub-fields
    const wantedDeviceFields = ['deviceId', 'description', 'dial', 'id'];
    const deviceSubFields = wantedDeviceFields.filter(f => deviceFields.includes(f));
    if (deviceSubFields.length === 0 && deviceFields.length > 0) {
      deviceSubFields.push(deviceFields[0]);
    }

    // Build the query with proper sub-selections
    let extensionFields = 'extensionId\ntech';
    if (userSubFields.length > 0) {
      extensionFields += `\nuser { ${userSubFields.join(' ')} }`;
    }
    if (deviceSubFields.length > 0) {
      extensionFields += `\ncoreDevice { ${deviceSubFields.join(' ')} }`;
    }

    const gqlQuery = `
      query {
        fetchAllExtensions {
          status
          message
          totalCount
          extension {
            ${extensionFields}
          }
        }
      }
    `;

    console.log('GraphQL query:', gqlQuery);

    const gqlResponse = await fetch(gqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gqlQuery }),
    });

    const gqlData = await gqlResponse.json();
    console.log('GraphQL response:', JSON.stringify(gqlData).substring(0, 2000));

    if (gqlData.errors) {
      console.error('GraphQL errors:', gqlData.errors);
      throw new Error(`GraphQL error: ${gqlData.errors[0]?.message || 'Unknown error'}`);
    }

    const fetchResult = gqlData.data?.fetchAllExtensions;
    if (!fetchResult?.status) {
      throw new Error(fetchResult?.message || 'Failed to fetch extensions');
    }

    const extensions: FreePBXExtension[] = (fetchResult.extension || []).map((ext: any) => {
      const user = ext.user || {};
      const device = ext.coreDevice || {};
      
      let displayName = user.displayname || user.name;
      if (!displayName && (user.fname || user.lname)) {
        displayName = `${user.fname || ''} ${user.lname || ''}`.trim();
      }
      if (!displayName) {
        displayName = device.description || `Extension ${ext.extensionId}`;
      }

      return {
        extension: String(ext.extensionId || ''),
        name: displayName,
        sipname: device.dial || '',
        tech: ext.tech || '',
      };
    });

    console.log(`Parsed ${extensions.length} extensions`);

    // Fetch real-time states from AMI
    const extensionIds = extensions.map(e => e.extension).filter(Boolean);
    console.log('Fetching extension states from AMI...');
    const extensionStates = await getExtensionStates(extensionIds);

    // Merge extensions with their states
    const extensionsWithStatus = extensions.map(ext => {
      const state = extensionStates.get(ext.extension);
      return {
        ...ext,
        status: state?.status || 'unknown',
        statusText: state?.statusText || 'Unknown',
      };
    });

    return new Response(JSON.stringify({ 
      success: true, 
      extensions: extensionsWithStatus,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching extensions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      extensions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
