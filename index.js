import DHT from 'bittorrent-dht'
import fs from 'fs'
import sodium from 'sodium-native'

const STEPS = process.argv[2] || 100000;

const dht = new DHT({
  bootstrap: [
    { host: 'router.bittorrent.com', port: 6881 },
    { host: 'router.utorrent.com', port: 6881 },
    { host: 'dht.transmissionbt.com', port: 6881 },
    // Running a reliable DHT node that responds to requests from behind NAT? please open an issue.
    { host: 'router.nuh.dev', port: 6881 }
  ]
})
const uniqueIPs = new Set()
const nodes = new Set()

process.on('SIGINT', close);

for (let i = 0; i < STEPS; i++) {
  const target = randomBytes(20)

  const message = {
    q: 'get',
    a: {
      id: dht._rpc.id,
      target
    }
  }

  await new Promise((resolve, reject) => {
    dht._closest(target, message, log, (error, n) => {
      if (error) reject(error);
      else resolve(n)
    })
  })

  function log(message, node) {
    node.host = node.address

    const client = message.v?.toString().slice(0, 2) || '__'

    const address = node.host + ":" + node.port
    uniqueIPs.add(node.host)
    nodes.add(address)
    console.log(`Step: ${i}/${STEPS} | target=${target.toString('hex')} | unique ips= ${uniqueIPs.size} / nodes=${nodes.size} | node: ${client} ${address} `)
  }
}

close()

function close() {
  ensureDir()

  fs.writeFileSync('./data/unique-ips.txt', [...uniqueIPs.values()].join('\n'))
  fs.writeFileSync('./data/all-nodes.txt', [...nodes.values()].sort().join('\n'))

  console.log("\n================================================")
  console.log("check data/unique-ips.txt and data/all-nodes.txt")
  console.log("================================================")
  console.log("Discovered", nodes.size, "nodes `cat ./data/all-nodes.txt`")
  console.log("Unique IPs: ", uniqueIPs.size, " `cat ./data/unique-ips.txt`")
  console.log("Generate a map of unique IPs: \n`cat ./data/unique-ips.txt | curl -XPOST --data - binary @- 'https://ipinfo.io/tools/map?cli=1'`");

  dht.destroy()
  process.exit(0)
}

function randomBytes(n = 32) {
  const buf = Buffer.allocUnsafe(n)
  sodium.randombytes_buf(buf)
  return buf
}

function ensureDir() {
  try {
    fs.mkdirSync('./data')
  } catch { }
}
