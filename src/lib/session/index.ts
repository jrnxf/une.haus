import { queryOptions } from "@tanstack/react-query";

import {
  clearSessionServerFn,
  getSessionServerFn,
  setSessionFlashServerFn,
  setSessionSidebarServerFn,
  setSessionThemeServerFn,
} from "~/lib/session/fns";

export const HAUS_SESSION_KEY = "haus.session";

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
    fn: clearSessionServerFn,
  },
  flash: {
    set: {
      fn: setSessionFlashServerFn,
    },
  },
  theme: {
    set: {
      fn: setSessionThemeServerFn,
    },
  },
  sidebar: {
    set: {
      fn: setSessionSidebarServerFn,
    },
  },
};
