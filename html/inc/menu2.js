let currentPage = 0;
const totalPages = document.querySelectorAll('.menu-page').length;

function updateMenuPosition() {
  const tocPages = document.getElementById('toc-pages');
  tocPages.style.transform = `translateX(-${currentPage * 100}%)`;
}

function nextMenu() {
  currentPage = (currentPage + 1) % totalPages;
  updateMenuPosition();
}

function prevMenu() {
  currentPage = (currentPage - 1 + totalPages) % totalPages;
  updateMenuPosition();
}
