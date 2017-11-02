const applicationConfiguration = require('../configurations/application')
const ManifestConfiguration = require('../configurations/manifest')

const ReferenceStrategy = require('../strategies/reference_strategy')
const FileSystem = require('../support/file_system')
const _ = require('lodash')

const promoteArchiveAction = (archiveRequest) => {
  const paths = applicationConfiguration.get(`paths`)
  const stagingPath = ReferenceStrategy.buildStagingPath(archiveRequest)
  const manifestJson = ManifestConfiguration.build(stagingPath)
  const archivePath = ReferenceStrategy.buildArchivePath(archiveRequest, manifestJson)
  const ignoreFolders = _.merge(
    [ `${_.get(manifestJson.paths, `archives`, '')}` ],
    applicationConfiguration.get(`rules.ignoreFiles`, []),
    manifestJson.ignore
  )

  return FileSystem
    .createDirectory(`${paths.archives}/`)
    .copyNonIgnoredFiles(stagingPath, archivePath, ignoreFolders)
    .then(() => manifestJson.manifest)
}

module.exports = promoteArchiveAction
