#!/usr/bin/env node
const sh = require('shorthash')
const makeSubnetConnections = require('./connections/MakeSubnetConnections').default
const makePipConnections = require('./connections/MakePipConnections').default

const inetBox = () => {
  let result = `
box "Internet" #LightGreen
  actor "User App User" as user2
  actor "DEVOPS eng" as user1
end box
`
  return result
}

const makeDiagId = (id) => {
    return 'id' + sh.unique(id)
}

const azurePublicBoundryBox = (pipMap, lbMap) => {
  let result = `
box "Azure Internet Boundary" #White

`
  Object.values(pipMap).forEach((pip) => {

    const pipid = makeDiagId(pip.id)
    result += `  collections "${pip.name} \\nPublic IP" as ${pipid}\n`

  })

  Object.values(lbMap).forEach((lb) => {

    const lbid = makeDiagId(lb.id)
    result += `  control "${lb.name} \\nLoad Balancer" as ${lbid}\n`

  })

  result += `
end box
`
  return result
}

const sortSubnets = (subnets) => {
  const score = (subnet) => {
    if (subnet.name.includes('bastion')) return 0
    if (subnet.name.includes('public')) return 1
    if (subnet.name.includes('database')) return 3
    if (subnet.name.includes('control')) return 4
    if (subnet.name.includes('cicd')) return 5
    return 3
  }
  return subnets.sort((a, b) => {
    let s1 = score(a)
    let s2 = score(b)
    return s1 - s2
  })
}

const azurePrivateNetBox = (vnet, subnetMap) => {
  let result = `
box "Private Azure VNET ${vnet.name}" #LightBlue

`
  sortSubnets(Object.values(subnetMap)).forEach((subnet) => {

    const snid = makeDiagId(subnet.id)
    result += `  collections "${subnet.name} \\nSubnet" as ${snid}\n`

  })

  result += `
end box

`
  return result
}

const deActivateLbs = (lbMap) => {
  let result = ""
  Object.values(lbMap).forEach((lb) => {
    const id = makeDiagId(lb.id)
    result += `deactivate ${id}\n`
  })
  return result
}
const activateLbs = (lbMap) => {
  let result = ""

  Object.values(lbMap).forEach((lb) => {
    const id = makeDiagId(lb.id)
    result += `activate ${id}\n`
  })
  return result
}

const make = (armData) => {

  let result = ""
  result += "@startuml\n"

  result += inetBox()
  result += azurePublicBoundryBox(armData.pipMap, armData.lbMap)
  result += azurePrivateNetBox(armData.vnet, armData.subnetMap)

  result += activateLbs(armData.lbMap)

  result += makePipConnections(armData)
  result += makeSubnetConnections(armData)

  result += deActivateLbs(armData.lbMap)

  result += "\n@enduml\n"
  return result
}

exports["default"] = make

