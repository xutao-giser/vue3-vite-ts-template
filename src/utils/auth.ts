import Cookies from 'js-cookie';

const TokenKey = 't';

export function getToken() {
  return Cookies.get(TokenKey);
}

export function setToken(token:string) {
  return Cookies.set(TokenKey, token);
}

export function removeToken() {
  return Cookies.remove(TokenKey);
}
export function getCookie(name:string) {
  return Cookies.get(name);
}
export function setCookie(name:string,token:string) {
  return Cookies.set(name, token);
}
export function removeCookie(name:string) {
  return Cookies.remove(name);
}
