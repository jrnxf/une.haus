import { queryOptions } from "@tanstack/react-query";

import {
  clearSesslionServerFn,
  getSessionServerFn,
  setFlashServerFn,
  toggleThemeServerFn,
} from "~/lib/session/fns";

export const HAUS_SESSION_KEY = "haus_session";

export const session = {
  get: {
    fn: getSessionServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["session.get"],
        queryFn: getSessionServerFn,
      });
    },
  },
  clear: {
    fn: clearSesslionServerFn,
  },
  theme: {
    toggle: {
      fn: toggleThemeServerFn,
    },
  },
  flash: {
    set: {
      fn: setFlashServerFn,
    },
  },
};
