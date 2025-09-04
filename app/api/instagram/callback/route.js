import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');
    const state = searchParams.get('state');

    console.log('📥 Instagram/Facebook callback received:', {
      code: code ? `${code.substring(0, 20)}...` : null,
      error,
      error_description,
      state
    });

    // Handle OAuth errors
    if (error) {
      console.error('❌ Facebook OAuth error:', error, error_description);
      return NextResponse.redirect(`${request.nextUrl.origin}?instagram_error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(`${request.nextUrl.origin}?instagram_error=no_authorization_code`);
    }

    // Forward to backend API
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/instagram/callback?code=${encodeURIComponent(code)}`;
    
    console.log('🔄 Forwarding Facebook callback to backend for Instagram processing');
    
    // Make request to backend with redirect: 'manual' to handle redirects ourselves
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
      },
      redirect: 'manual' // Handle redirects manually
    });

    console.log('📬 Backend response:', {
      status: backendResponse.status,
      redirected: backendResponse.redirected,
      url: backendResponse.url
    });

    // If backend returns redirect (302/307), extract redirect URL from Location header
    if (backendResponse.status === 302 || backendResponse.status === 307) {
      const redirectUrl = backendResponse.headers.get('Location');
      if (redirectUrl) {
        console.log('🔄 Following backend redirect to:', redirectUrl);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // If backend redirects (which it should), follow that redirect
    if (backendResponse.redirected) {
      return NextResponse.redirect(backendResponse.url);
    }

    // If backend returns success, try to parse JSON (only if content-type is JSON)
    if (backendResponse.ok) {
      const contentType = backendResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await backendResponse.json();
        const username = data?.account?.username || '';
        return NextResponse.redirect(`${request.nextUrl.origin}?instagram_connected=true&username=${encodeURIComponent(username)}`);
      } else {
        // Backend returned HTML/redirect, assume success
        return NextResponse.redirect(`${request.nextUrl.origin}?instagram_connected=true`);
      }
    }

    // If backend returns error, redirect with error
    console.error('❌ Backend returned error:', backendResponse.status);
    return NextResponse.redirect(`${request.nextUrl.origin}?instagram_error=connection_failed`);

  } catch (error) {
    console.error('❌ Error handling Instagram callback:', error.message);
    return NextResponse.redirect(`${request.nextUrl.origin}?instagram_error=proxy_failed`);
  }
}