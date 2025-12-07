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
    const pbxUsername = Deno.env.get('PBX_USERNAME');
    const pbxPassword = Deno.env.get('PBX_PASSWORD');
    const pbxUrl = 'https://pbx.natew.me/admin/config.php?display=bulkhandler&quietmode=1&activity=export&export=extensions';

    if (!pbxUsername || !pbxPassword) {
      console.error('PBX credentials not configured');
      throw new Error('PBX credentials not configured');
    }

    console.log('Fetching extensions from FreePBX...');

    // Create Basic Auth header
    const authHeader = 'Basic ' + btoa(`${pbxUsername}:${pbxPassword}`);

    // Step 1: Get the login page to extract the session key
    const loginPageResponse = await fetch(pbxUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (compatible; NetBridge Directory/1.0)',
      },
      redirect: 'follow',
    });

    // Check if we got a redirect or login page
    const loginPageText = await loginPageResponse.text();
    console.log('Response status:', loginPageResponse.status);
    console.log('Response length:', loginPageText.length);

    // If the response contains CSV data (extension data), parse it
    if (loginPageText.includes('extension,') || loginPageText.includes('"extension"')) {
      const extensions = parseCSV(loginPageText);
      console.log(`Parsed ${extensions.length} extensions from CSV`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        extensions,
        lastUpdated: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we get HTML (login page), try form-based login
    if (loginPageText.includes('loginform') || loginPageText.includes('login_form')) {
      console.log('Login page detected, attempting form login...');
      
      // Extract session key if present
      const sessionKeyMatch = loginPageText.match(/name="sessionKey"\s+value="([^"]+)"/);
      const sessionKey = sessionKeyMatch ? sessionKeyMatch[1] : '';
      
      // Create form data for login
      const formData = new URLSearchParams();
      formData.append('username', pbxUsername);
      formData.append('password', pbxPassword);
      if (sessionKey) {
        formData.append('sessionKey', sessionKey);
      }

      // Get cookies from the first response
      const cookies = loginPageResponse.headers.get('set-cookie') || '';
      
      // Submit login form
      const loginResponse = await fetch('https://pbx.natew.me/admin/config.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (compatible; NetBridge Directory/1.0)',
        },
        body: formData.toString(),
        redirect: 'follow',
      });

      // Get the session cookies after login
      const authCookies = loginResponse.headers.get('set-cookie') || cookies;
      
      // Now fetch the extensions with the authenticated session
      const extensionsResponse = await fetch(pbxUrl, {
        method: 'GET',
        headers: {
          'Cookie': authCookies,
          'User-Agent': 'Mozilla/5.0 (compatible; NetBridge Directory/1.0)',
        },
        redirect: 'follow',
      });

      const extensionsText = await extensionsResponse.text();
      console.log('Extensions response length:', extensionsText.length);
      
      if (extensionsText.includes('extension,') || extensionsText.includes('"extension"')) {
        const extensions = parseCSV(extensionsText);
        console.log(`Parsed ${extensions.length} extensions from CSV after login`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          extensions,
          lastUpdated: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Still seeing login page - credentials might be wrong
      console.error('Still seeing login page after auth attempt');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authentication failed. Please check PBX credentials.',
        extensions: []
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Unknown response format
    console.error('Unexpected response format from FreePBX');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unexpected response from PBX',
      extensions: []
    }), {
      status: 500,
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

function parseCSV(csvText: string): FreePBXExtension[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  console.log('CSV Headers:', headers);
  
  const extensions: FreePBXExtension[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const ext: Record<string, string> = {};
    headers.forEach((header, index) => {
      ext[header.toLowerCase().trim()] = values[index] || '';
    });
    
    // Only include if we have an extension number
    if (ext.extension) {
      extensions.push(ext as FreePBXExtension);
    }
  }
  
  return extensions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
