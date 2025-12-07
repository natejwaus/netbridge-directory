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
    const gqlUrl = 'https://pbx.natew.me/admin/api/api/gql';

    if (!clientId || !clientSecret) {
      console.error('PBX API credentials not configured');
      throw new Error('PBX API credentials not configured');
    }

    console.log('Authenticating with FreePBX API...');

    // Step 1: Get OAuth2 access token using client credentials grant
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
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received');
    }

    console.log('Successfully obtained access token');

    // Step 2: Fetch extensions using GraphQL API
    const gqlQuery = `
      query {
        fetchAllExtensions {
          status
          message
          totalCount
          extension {
            extensionId
            name
            email
            outboundCid
            callerID
            voicemail
          }
        }
      }
    `;

    const gqlResponse = await fetch(gqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gqlQuery }),
    });

    if (!gqlResponse.ok) {
      const errorText = await gqlResponse.text();
      console.error('GraphQL request failed:', gqlResponse.status, errorText);
      throw new Error(`Failed to fetch extensions: ${gqlResponse.status}`);
    }

    const gqlData = await gqlResponse.json();
    console.log('GraphQL response:', JSON.stringify(gqlData).substring(0, 500));

    // Check for GraphQL errors
    if (gqlData.errors) {
      console.error('GraphQL errors:', gqlData.errors);
      throw new Error(`GraphQL error: ${gqlData.errors[0]?.message || 'Unknown error'}`);
    }

    // Parse the response
    const fetchResult = gqlData.data?.fetchAllExtensions;
    if (!fetchResult?.status) {
      console.error('fetchAllExtensions failed:', fetchResult?.message);
      throw new Error(fetchResult?.message || 'Failed to fetch extensions');
    }

    const extensions: FreePBXExtension[] = (fetchResult.extension || []).map((ext: any) => ({
      extension: String(ext.extensionId || ''),
      name: ext.name || ext.callerID || '',
      voicemail: ext.voicemail || '',
      sipname: ext.extensionId || '',
      outboundcid: ext.outboundCid || '',
      email: ext.email || '',
    }));

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
