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
  outboundcid?: string;
  callwaiting?: string;
  vmcontext?: string;
  noanswer?: string;
  recording?: string;
  [key: string]: string | undefined;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('PBX_CLIENT_ID');
    const clientSecret = Deno.env.get('PBX_CLIENT_SECRET');
    
    const tokenUrl = 'https://pbx.natew.me/admin/api/api/token';
    const restUrl = 'https://pbx.natew.me/admin/api/api/rest';

    if (!clientId || !clientSecret) {
      console.error('PBX API credentials not configured');
      throw new Error('PBX API credentials not configured');
    }

    console.log('Authenticating with FreePBX REST API...');

    // Step 1: Get OAuth2 access token using client credentials grant
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'rest',
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
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received');
    }

    console.log('Successfully obtained access token');

    // Step 2: Fetch extensions using REST API
    const extensionsResponse = await fetch(`${restUrl}/core/extensions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!extensionsResponse.ok) {
      const errorText = await extensionsResponse.text();
      console.error('Extensions request failed:', extensionsResponse.status, errorText);
      throw new Error(`Failed to fetch extensions: ${extensionsResponse.status}`);
    }

    const extensionsData = await extensionsResponse.json();
    console.log('Extensions API response:', JSON.stringify(extensionsData).substring(0, 500));

    // Parse the response - adjust based on actual API structure
    let extensions: FreePBXExtension[] = [];
    
    if (Array.isArray(extensionsData)) {
      extensions = extensionsData.map(mapExtension);
    } else if (extensionsData.data && Array.isArray(extensionsData.data)) {
      extensions = extensionsData.data.map(mapExtension);
    } else if (extensionsData.extensions && Array.isArray(extensionsData.extensions)) {
      extensions = extensionsData.extensions.map(mapExtension);
    } else {
      console.log('Unexpected response structure, attempting to extract extensions');
      // Try to find extensions in nested structure
      const possibleArrays = Object.values(extensionsData).filter(Array.isArray);
      if (possibleArrays.length > 0) {
        extensions = (possibleArrays[0] as any[]).map(mapExtension);
      }
    }

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

function mapExtension(ext: any): FreePBXExtension {
  // Map various possible field names to our standard structure
  return {
    extension: String(ext.extension || ext.extensionId || ext.id || ext.number || ''),
    name: ext.name || ext.displayName || ext.callerID || ext.description || '',
    voicemail: ext.voicemail || ext.vmEnabled || '',
    sipname: ext.sipname || ext.username || '',
    outboundcid: ext.outboundcid || ext.outboundCid || '',
    callwaiting: ext.callwaiting || ext.callWaiting || '',
    vmcontext: ext.vmcontext || '',
    noanswer: ext.noanswer || '',
    recording: ext.recording || '',
  };
}
