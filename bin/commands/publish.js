module.exports = {
  registerVorpalCommand: (vorpal, applicationConfiguration) => {
    return vorpal
      .command(`publish`)
      .description(`Bundle, then upload`)
      .validate(function (args) {
        return true
      })
      .action(function (args, done) {
        console.warn(`not implemented`)
        done()
      })
  }
}
