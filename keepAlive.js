const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot ayakta babus 😎");
});

app.listen(3000, () => {
  console.log("KeepAlive aktif");
});
