const crypto = require('crypto')
const path = require('path')
const _ = require('lodash')

const applicationConfiguration = require('../configurations/application')

const Discover = {
  COMPONENT_ASPECT: /.*?\/([a-z0-9-_.]*?)[./]?(zip|tar|tgz|gz|tar.gz|git)?$/i,
  HAS_EMBEDDED_VERSION: /.*?[_-]+([\d.]*)$/i
}

/**
 * a _reference_ can have a shape of scope, resource, or archiveRequest
 *
 * scope-reference to resource-reference
 * "@source/group/resource version" ==> "url resource version"
 *
 * resource-reference to archiveRequest-reference
 * "uri#version" ===> { url, version }
 */
class ReferenceParser {
  static referenceToArchiveRequest (reference, overrideUniqueName = undefined) {
    const scopeOrReference = this.normalizeReference(reference)
    const {
      resource,
      scope
    } = this.__scopeToResource(scopeOrReference)
    const archiveRequest = this.__resourceToArchiveRequest(resource, scope, overrideUniqueName)

    return archiveRequest
  }

  /**
   *
   * folder#1.2.3 res  => folder#1.2.3 res
   * folder#1.2.3      => folder#1.2.3
   * folder res        => folder#master res
   *
   * @param { reference } reference
   * @returns "reference"
   */
  static normalizeReference (reference) {
    return _.trimEnd(_.trimStart(reference || '', path.sep))
  }

  static splitArchiveExtension (uri) {
    const [_0, archive, extension] = Discover.COMPONENT_ASPECT.exec(uri) || [``, uri, ``] // eslint-disable-line
    return [archive, extension]
  }

  static splitURIVersion (reference) {
    const patternMarkers = applicationConfiguration.get(`rules.patternMarkers`)
    const versionMarker = _.find(patternMarkers.version, (versionMarker) => reference.indexOf(versionMarker) !== -1)

    return reference.split(versionMarker || _.first(patternMarkers.version))
  }

  /**
   *
   * @param {*} scopeOrReference
   */
  static __scopeToResource (scopeOrReference) {
    const patternMarkers = applicationConfiguration.get(`rules.patternMarkers`)
    const [uri, version = `*`] = this.splitURIVersion(scopeOrReference)
    const uriAspects = uri.split(patternMarkers.separator)
    const scope = this.__matchConversionRule(uriAspects)

    if (!scope) {
      return {
        resource: scopeOrReference,
        scope: {}
      }
    }

    const {
      pattern,
      pull_uri, // OR push_uri if operation is publish
      constants
    } = scope
    const templateVariables = _.zipObject(pattern.split(patternMarkers.separator), uriAspects)

    return {
      scope,
      resource: _.template(pull_uri)(_.merge({}, templateVariables, constants, {
        version
      }))
    }
  }

  /**
   *
   * @param {*} resource
   */
  static __resourceToArchiveRequest (resource, scope, overrideUniqueName = undefined) {
    const versionMarker = _.first(applicationConfiguration.get(`rules.patternMarkers.version`))
    const {
      staging,
      cache
    } = applicationConfiguration.get(`paths`)

    const [uri, _version] = this.splitURIVersion(resource)
    const [_archive, extension] = this.splitArchiveExtension(uri)
    const [archive, version = `*`] = this.__detectVersionInArchive(_archive, _version)

    const versionFolder = crypto.createHash(`md5`).update(version).digest(`hex`)
    const installedName = overrideUniqueName || archive

    const safeExtension = (extension) ? `.${extension}` : `/`
    const cachePath = `${cache}/${archive}__${versionFolder}${safeExtension}`
    const stagingPath = `${staging}/${archive}/${versionFolder}/`
    const uuid = `${installedName}${versionMarker}${version}`

    return {
      installedVersion: version,
      installedName,
      stagingPath,
      cachePath,
      archive,
      version,
      scope,
      uuid,
      uri
    }
  }

  static __detectVersionInArchive (archive, version) {
    const embeddedVersion = Discover.HAS_EMBEDDED_VERSION.exec(archive)

    if (embeddedVersion) {
      return [archive.substr(0, embeddedVersion.index), _.last(embeddedVersion)]
    } else {
      return [archive, version]
    }
  }

  /**
   *
   * @param {*} uriAspects
   * @returns a scope object or undefined
   */
  static __matchConversionRule (uriAspects) {
    const sources = applicationConfiguration.get(`sources`)
    const scope = uriAspects[0] = (_.first(uriAspects) || '')

    return _.find(sources, (_0, sourceKey) => {
      return scope === sourceKey
    })
  }
}

module.exports = ReferenceParser
