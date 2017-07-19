#!/usr/bin/env node
let sh = require('shorthash');
const makeDiagId = (id) => {
  return 'id' + sh.unique(id)
}

const matchSourceAddressPrefix = (prefix, source) => {
  console.log(`todo: prefix ${prefix} source ${source}`)
  return false
}

const connectCidSubnets = (rule, armData, id) => {
  let result = ""
  Object.values(armData.subnetMap).forEach((subnet) => {
    const sid = makeDiagId(subnet.id)
    if (id !== sid && matchSourceAddressPrefix(subnet.properties.addressPrefix, rule.properties.sourceAddressPrefix))
      result += `${id} <- ${sid} : ${rule.name} (port ${rule.properties.destinationPortRange}) 
`
  })
  return result
}

const connectAllSubnets = (rule, armData, id) => {
  let result = ""
  Object.values(armData.subnetMap).forEach((subnet) => {
    const sid = makeDiagId(subnet.id)
    if (id !== sid)
      result += `${id} <- ${sid} : ${rule.name} (port ${rule.properties.destinationPortRange}) 
`
  })
  return result
}

const makeLbConnections = (rule, armData, id, subnet) => {
  let result = ""
  Object.values(armData.lbMap).forEach((lb) => {
    const id = makeDiagId(lb.id)
  })
  console.log(`todo: allow from inet via lb`)

  return result
}

const connectNic = (ipConfigId, rule, armData, id, subnet) => {
  let result = ""
  const nicId = ipConfigId.substring(0, ipConfigId.indexOf('/ipConfigur'))
  const nic = armData.nicMap[nicId]
  nic.properties.ipConfigurations.forEach(ipconfig => {
    const subnetId = ipconfig.properties.subnet.id
    if (subnetId === subnet.id) {
      const subnetShortId = makeDiagId(subnet.id)
      result += `${subnetShortId} <- ${id} : ${rule.name} (port ${rule.properties.destinationPortRange}) 
`
    }
  })
  return result
}

const connectLb = (ipConfigId, rule, armData, id, subnet) => {
  let result = ""
  const lbId = ipConfigId.substring(0, ipConfigId.indexOf('/frontendIPConfigurations'))
  const lb = armData.lbMap[lbId]
  lb.properties.backendAddressPools.forEach(pool => {
    pool.properties.backendIPConfigurations.forEach(ipConfig => {
      const nicId = ipConfig.id.substring(0, ipConfig.id.indexOf('/ipConfigurations'))
      const nic = armData.nicMap[nicId]
      nic.properties.ipConfigurations.forEach(nicIpConfig => {
        const subnetId = nicIpConfig.properties.subnet.id
        if (subnetId === subnet.id) {
          lb.properties.loadBalancingRules.forEach(lbRule => {
            lb.properties.frontendIPConfigurations.forEach(frontendConfig => {
              console.log(JSON.stringify(frontendConfig, 0, 2)) //get pip
              const pipId = makeDiagId(frontendConfig.properties.publicIPAddress)
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              //bug is above, id is just 'id'
              const lbId = makeDiagId(lb.id)
              result += `${pipId} -> ${lbId} : ${rule.name} (port ${lbRule.properties.frontendPort}) 
`
            })
            const subnetShortId = makeDiagId(subnet.id)
            const newConn = `${subnetShortId} <- ${id} : ${rule.name} (port ${lbRule.properties.backendPort}) 
`
            if (!result.includes(newConn)) result += newConn
          })
        }
      })
    })
  })
  return result
}

const makePipConnections = (rule, armData, id, subnet) => {
  let result = ""
  Object.values(armData.pipMap).forEach((pip) => {
    const id = makeDiagId(pip.id)
    console.log(`todo: allow from inet via pip`)
    //console.log(JSON.stringify(pip, 0, 2))
    const ipConfigId = pip.properties.ipConfiguration.id
    if (ipConfigId.includes('networkInterfaces')) {
      result += connectNic(ipConfigId, rule, armData, id, subnet)
    } else if (ipConfigId.includes('loadBalancers')) {
      result += connectLb(ipConfigId, rule, armData, id, subnet)
    }
  })

  return result
}

const makeSubnetConnections = (armData) => {
  let result = ""
  Object.values(armData.subnetMap).forEach((subnet) => {
    const id = makeDiagId(subnet.id)
    // todo: ensure there are explicit deny rules and/or sane default deny rules
    // iterate on rules
    const nsg = armData.nsgMap[subnet.properties.networkSecurityGroup.id]
    const rules = nsg.properties.securityRules
    rules.filter(rule => rule.properties.access !== 'Deny').forEach(rule => {
      if (rule.properties.sourceAddressPrefix === 'VirtualNetwork') {
        // map to ALL other subnets
        result += connectAllSubnets(rule, armData, id)
      } else if (rule.properties.sourceAddressPrefix === '*') {
        result += makeLbConnections(rule, armData, id, subnet)
        result += makePipConnections(rule, armData, id, subnet)
        result += connectAllSubnets(rule, armData, id)
      } else if (rule.properties.sourceAddressPrefix === 'INTERNET') {
        // map to pips and lbs
        result += makeLbConnections(rule, armData, id, subnet)
        result += makePipConnections(rule, armData, id, subnet)
      } else {
        // handle cidr
        result += connectCidSubnets(rule, armData, id)
      }
    })
  })

  return result
}

exports["default"] = makeSubnetConnections

