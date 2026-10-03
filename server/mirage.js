export default function mirage(req, res, next) {
  if (typeof mirage.handler === 'function') {
    return mirage.handler(req, res, next);
  }
  next();
}

export function loginFailed(req, username) {
  if (typeof mirage.onLoginFailed === 'function') {
    mirage.onLoginFailed(req, username);
  }
}

export function loginSucceeded(req, username) {
  if (typeof mirage.onLoginSucceeded === 'function') {
    mirage.onLoginSucceeded(req, username);
  }
}

mirage.loginFailed = loginFailed;
mirage.loginSucceeded = loginSucceeded;

