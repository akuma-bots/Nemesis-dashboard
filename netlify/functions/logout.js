const { cookieLogout } = require("./lib/sessao");

exports.handler = async () => {
  return { statusCode: 302, headers: { Location: "/", "Set-Cookie": cookieLogout() }, body: "" };
};
