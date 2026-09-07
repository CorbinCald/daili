const demos = [...document.querySelectorAll("video")];
for (const demo of demos) {
  demo.addEventListener("play", () => {
    for (const other of demos) if (other !== demo) other.pause();
  });
}
