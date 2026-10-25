function createStreamBuffer({ schedule, cancel, write }) {
  let pending = "";
  let frame;
  const flush = () => {
    frame = undefined;
    const text = pending;
    pending = "";
    if (text) write(text);
  };
  return {
    push(text) {
      pending += text;
      if (frame === undefined) frame = schedule(flush);
    },
    clear() {
      if (frame !== undefined) cancel(frame);
      frame = undefined;
      pending = "";
    },
  };
}

const api = { createStreamBuffer };
if (typeof module === "object") module.exports = api;
else window.voxivaStreamBuffer = api;
