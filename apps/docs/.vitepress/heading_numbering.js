(function () {
  let h1 = 0,
    h2 = 0;
  const headings = [];
  for (const el of document.querySelectorAll(
    ".vp-export-section h1, .vp-export-section h2, .vp-export-section h3",
  )) {
    if (el.tagName === "H1") {
      h1++;
      h2 = 0;
      el.insertAdjacentText("afterbegin", `${h1}. `);
    } else if (el.tagName === "H2") {
      h2++;
      el.insertAdjacentText("afterbegin", `${h1}.${h2}. `);
    }
    headings.push(el.innerText.trim());
  }
})();
