import {
  enterCodeServerFn,
  registerServerFn,
  sendAuthCodeServerFn,
} from "~/lib/auth/fns";
import {
  enterCodeSchema,
  registerSchema,
  sendCodeSchema,
} from "~/lib/auth/schemas";

export const auth = {
  register: {
    fn: registerServerFn,
    schema: registerSchema,
  },
  sendCode: {
    fn: sendAuthCodeServerFn,
    schema: sendCodeSchema,
  },
  enterCode: {
    fn: enterCodeServerFn,
    schema: enterCodeSchema,
  },
};
