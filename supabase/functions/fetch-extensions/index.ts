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
      userSubFields.push(userFields[0]); // Use first available field
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

    return new Response(JSON.stringify({ 
      success: true, 
      extensions,
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
