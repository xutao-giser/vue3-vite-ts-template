import axios from 'axios'

function loadConfig(
  config: { [key: string]: unknown },
  target: { [key: string]: unknown }
) {
  Object.keys(config).forEach(key => {
    target[key] = config[key]
  })
}

export async function init() {
  await axios
    .all([
      axios.get('/config/main.config.json')
    ])
    .then(arr => {
      const mapConfigJson = arr[0].data
      loadConfig(mapConfigJson,{})
      document.title = mapConfigJson.title
    })
}
