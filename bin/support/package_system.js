const applicationConfiguration = require('../configurations/application')
const fs = require('fs-extra')

class PackageSystem {
  static selectConfiguration (stagingPath) {
    const priority = applicationConfiguration.get(`rules.configurationPriority`)

    let json
    for (const file of priority) {
      json = fs.readJsonSync(`${stagingPath}/${file}`, {
        throws: false
      })

      if (json) {
        break
      }
    }

    return json
  }
}

module.exports = PackageSystem
