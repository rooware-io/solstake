export function validateEmail(email: string): boolean {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export async function submitEmail(email: string) {
  try {
    const response = await fetch(
    'https://hooks.zapier.com/hooks/catch/1602339/bob62i2/',
    {
        method: 'POST',
        // https://zapier.com/help/create/code-webhooks/troubleshoot-webhooks-in-zapier#posting-json-from-web-browser-access-control-allow-headers-in-preflight-response-error
        body: JSON.stringify({
        'email': email
        })
    }
    );

    console.log(response);
    return response.ok;
  }
  catch(TypeError) { // TypeError: NetworkError when attempting to fetch resource.
    return false;
  }
}