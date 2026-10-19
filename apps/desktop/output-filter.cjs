function createOutputFilter() {
  let buffer = "";
  let hidden = "";

  function push(chunk) {
    buffer += chunk;
    let visible = "";
    while (buffer) {
      if (hidden.startsWith("header-")) {
        const end = buffer.indexOf(">>>");
        if (end < 0) { buffer = ""; break; }
        buffer = buffer.slice(end + 3);
        hidden = hidden === "header-file" ? "file" : "read";
        continue;
      }
      if (hidden === "read") { buffer = ""; break; }
      if (hidden === "file") {
        const end = buffer.indexOf("<<<END>>>");
        if (end < 0) { buffer = ""; break; }
        buffer = buffer.slice(end + 9);
        hidden = "";
        continue;
      }
      const marker = /<<<(READ|FILE)/.exec(buffer);
      if (marker) {
        visible += buffer.slice(0, marker.index);
        buffer = buffer.slice(marker.index + marker[0].length);
        hidden = marker[1] === "READ" ? "header-read" : "header-file";
        continue;
      }
      let hold = 0;
      for (let size = 1; size <= Math.min(6, buffer.length); size++) {
        const tail = buffer.slice(-size);
        if (["<<<READ", "<<<FILE"].some((prefix) => prefix.startsWith(tail))) hold = size;
      }
      if (!hold) { visible += buffer; buffer = ""; break; }
      visible += buffer.slice(0, -hold);
      buffer = buffer.slice(-hold);
      break;
    }
    return visible;
  }

  return { push, finish: () => hidden ? "" : buffer };
}

module.exports = { createOutputFilter };
