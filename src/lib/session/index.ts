import {
  clearSesslionServerFn,
  getSessionServerFn,
  setFlashServerFn,
} from "~/lib/session/fns";

export const HAUS_SESSION_KEY = "haus_session";

export const session = {
  get: {
    fn: getSessionServerFn,
  },
  clear: {
    fn: clearSesslionServerFn,
  },
  flash: {
    set: {
      fn: setFlashServerFn,
    },
  },
};
