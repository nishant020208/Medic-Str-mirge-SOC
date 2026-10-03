export default function mirage(req, res, next) {
  next();
}

export function loginFailed(req, username) {}
export function loginSucceeded(req, username) {}

mirage.loginFailed = loginFailed;
mirage.loginSucceeded = loginSucceeded;
