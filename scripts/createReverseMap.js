import sha from 'solidity-sha3'
import fs from 'fs'

async function run() {
  const coors = []
  const limit = 25
  for (let x = -limit; x < limit; x++) {
    for (let y = -limit; y < limit; y++) {
      coors.push({x, y, hash: sha(x, '|', y)})
    }
  }
  const formatHashes = data => `"${data.hash}":{"x":"${data.x}","y":"${data.y}"}`
  const data = `{ ${coors.map(formatHashes)} }`
  fs.writeFileSync('./reverseHash.json', data)
}

run()
