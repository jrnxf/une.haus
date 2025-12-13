import { createIsomorphicFn } from "@tanstack/react-start";

const x = createIsomorphicFn().client(() => {
  function onPageHide() {
    console.log("page hide");
  }
  globalThis.addEventListener("pagehide", onPageHide);

  setInterval(() => {
    console.log("good");
  }, 3000);
});

x();
