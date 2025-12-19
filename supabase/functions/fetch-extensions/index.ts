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
  status: string;
  statusText: string;
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

    // Query extensions - note: coreDevice.status causes internal errors so we skip it
    const gqlQuery = `
      query {
        fetchAllExtensions {
          status
          message
          totalCount
          extension {
            extensionId
            tech
            user {
              name
              extension
              donotdisturb
            }
            coreDevice {
              deviceId
              description
              dial
            }
          }
        }
      }
    `;

    console.log('Fetching extensions...');

    const gqlResponse = await fetch(gqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gqlQuery }),
    });

    const gqlData = await gqlResponse.json();
    console.log('GraphQL response received');

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
      
      let displayName = user.name;
      if (!displayName) {
        displayName = device.description || `Extension ${ext.extensionId}`;
      }

      // Get DND status (could be string "yes"/"no" or boolean)
      const dndValue = user.donotdisturb;
      const isDnd = dndValue === true || dndValue === 'yes' || dndValue === 'YES' || dndValue === '1' || dndValue === 1;

      // Since we can't get real-time device status without AMI, 
      // we show DND if set, otherwise "Available"
      let status = 'available';
      let statusText = 'Available';
      
      if (isDnd) {
        status = 'dnd';
        statusText = 'Do Not Disturb';
      }

      return {
        extension: String(ext.extensionId || ''),
        name: displayName,
        sipname: device.dial || '',
        tech: ext.tech || '',
        status,
        statusText,
      };
    });

    console.log(`Returning ${extensions.length} extensions`);

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
