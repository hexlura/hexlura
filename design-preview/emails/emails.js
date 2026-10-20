// Desktop / mobile width toggle for the email mockups (mockup chrome only).
document.querySelectorAll('.toggle button').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.body.classList.toggle('is-mobile', btn.dataset.mode === 'mobile')
    document.querySelectorAll('.toggle button').forEach(function (b) {
      b.classList.toggle('on', b === btn)
    })
  })
})
