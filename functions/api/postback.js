export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Parse TUNE (Barges) postback parameters
  const clickId = url.searchParams.get('click_id');
  const payout = parseFloat(url.searchParams.get('payout') || '0');
  const transactionId = url.searchParams.get('transaction_id') || 'unknown';

  // If there's no click_id, we can't tie it back to a user, but we'll still log it
  if (!clickId) {
    return new Response('Missing click_id', { status: 400 });
  }

  const posthogKey = env.PUBLIC_POSTHOG_KEY;
  const posthogHost = env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    return new Response('Server configuration error: Missing PostHog Key', { status: 500 });
  }

  // Send server-side event to PostHog
  const posthogEvent = {
    api_key: posthogKey,
    event: 'Order_Converted',
    properties: {
      distinct_id: clickId, // Crucial: Ties back to the frontend user
      revenue: payout, // Special property used by PostHog for revenue tracking
      transaction_id: transactionId,
      $source: 'tune_s2s_postback'
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(`${posthogHost}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(posthogEvent)
    });

    if (!response.ok) {
      console.error('Failed to send to PostHog:', await response.text());
      return new Response('Failed to forward to analytics', { status: 502 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error sending to PostHog:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
