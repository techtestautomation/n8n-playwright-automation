import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const html = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Playwright Automation Demo</title>
</head>

<body>
  <main>
    <h1>Playwright Automation Demo</h1>

    <label for="name">Your name</label>
    <input id="name" name="name" type="text" />

    <button id="submit" type="button">Submit</button>

    <p id="result" hidden></p>
  </main>

  <script>
    const nameInput = document.querySelector("#name");
    const submitButton = document.querySelector("#submit");
    const result = document.querySelector("#result");

    submitButton.addEventListener("click", () => {
      result.textContent = \`Hello \${nameInput.value}\`;
      result.hidden = false;
    });
  </script>
</body>
</html>
`;

const server = createServer((_request, response) => {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
  });

  response.end(html);
});

server.listen(port, host, () => {
  console.log(`Demo app listening on http://${host}:${port}`);
});
