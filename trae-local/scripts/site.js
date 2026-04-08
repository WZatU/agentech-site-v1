document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    document.body.dataset.lastClick = link.getAttribute("href") || "";
  });
});
