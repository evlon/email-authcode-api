import PostalMime from 'postal-mime';

/**
 * Extracts the code from the email content.
 * Code is a sequence of 6-12 digits. 
 */
function extract_code(text, env) {
  const log = get_logger(env);
  let content = text;
  env.AUTHCODE_REGEXP = env.AUTHCODE_REGEXP ? env.AUTHCODE_REGEXP :  `\b\d{6,12}\b`;

  for(
    let authcode_regexp = env.AUTHCODE_REGEXP,i=1;
    authcode_regexp; 
    authcode_regexp = env["AUTHCODE_REGEXP" + i++]
  ){
    const pattern = new RegExp(authcode_regexp);
    let match = content.match(pattern);
    log("regexp:",pattern, content, match);
    if (!(match && match[0])) {
      throw new Error('Code not found in the email content.');      
    } 

    content = match[0]
  }
 
  
  return content;
}


/**
 * Returns a logger function based on the DEBUG environment variable. 
 */
function get_logger(env) {
  return env.DEBUG ? console.log : () => {};
}

/**
 * (Main) Email worker. 
 */
const export_default = {
  async email(message, env, ctx) {
    const log = get_logger(env);
    const ALLOWED_SENDERS = env.ALLOWED_SENDERS.split(',').map(sender => sender.trim());
    // const FORWARD_TO = env.FORWARD_TO;

    log(env);
    log("Received email from:", message.from);

    // Check if the sender is allowed.
    if (!(
      ALLOWED_SENDERS.some(sender => message.from.endsWith(sender)) || 
      ALLOWED_SENDERS.some(sender => message.from.startsWith(sender.split('@')[0]) &&  '@' + message.from.endsWith(sender.split('@')[1]))
      )        
    ) {
    message.setReject("Sender is not allowed.");  
    log("Email is from a disallowed sender.");
    return;
  }

    log("Email is from an allowed sender");

    // Parse the email content.
    const email = await PostalMime.parse(message.raw);

    log("Email content:", email.text);
    await env.authcode.put(message.from + "_text", email.text);

    // Try to extract the code from the email content.
    // If the code is not found, forward the email to the specified address.
    let code;
    try {
      code = extract_code(email.text,env);
    }	catch (e) {
      await message.forward(FORWARD_TO);
      return;
    }

    log("Code extracted:", code);

    // authcode is kv namespace
    await env.authcode.put(message.from, code);
 
    // If the put kv was not successful, forward the email to the specified address.
     
    await message.forward(FORWARD_TO);
      
  },
  async fetch(request, env, ctx) {
    let url = request.url.substr(8);
    let mail = decodeURIComponent(url.substr(url.indexOf('/') + 1));
    let code =  await env.authcode.get(mail);
    return new Response(code);
  },
}

console.log(export_default);

/*
export default export_default;
*/
export default export_default;