document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy);
    const label = button.querySelector("span");
    const previous = label.textContent;
    label.textContent = "Copied";
    setTimeout(() => (label.textContent = previous), 1400);
  });
});
