import extractFileHash from "../src";

const hostUrl = "https://login.xfinity.com/";
async function GetFile(): Promise<number | null> {
  const response = await fetch(hostUrl + "login");
  let cookies = response.headers.get("Set-Cookie");
  if (cookies) {
    cookies = cookies
      .split(";")
      .map((cookie) => cookie.trim())
      .join("; ");
  }
  const responseBody = await response.text();
  const regexSrc = /<script type="text\/javascript"  src="(.*)"/gm;
  const matches = responseBody.match(regexSrc);
  if (matches) {
    const srcPath = regexSrc.exec(responseBody);
    const sensResponse = await fetch(hostUrl + srcPath![1], {
      headers: {
        Cookie: cookies || "",
      },
    });
    const sensFileContent = await sensResponse.text();
    return extractFileHash(sensFileContent);
  }
  console.log("[REGEX SRC] No matches found");
  return null;
}

(async () => {
  const hash = await GetFile();
  if (hash) {
    console.log("[XFINITY FILE HASH] " + hash);
  } else {
    console.log("[XFINITY FILE HASH] No hash found");
  }
})();