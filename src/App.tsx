import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import { invoke } from '@tauri-apps/api/tauri'
import './App.css'
import { open } from '@tauri-apps/api/dialog'
import { readBinaryFile } from '@tauri-apps/api/fs'
import { Slider } from './components/Slider'
import { Button } from './components/Button'

const DEFAULT_VOLUME = 0.25
function computeRms(frequencyData: Uint8Array) {
  let sum = 0
  for (let i = 0; i < Math.round(frequencyData.length * 0.25); i++) {
    sum += frequencyData[i] * frequencyData[i]
  }
  const rms = Math.sqrt(sum / frequencyData.length)
  return rms
}

function App() {
  const [musicFile, setMusicFile] = useState('')
  const [volume, setVolume] = useState([DEFAULT_VOLUME])

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(
    null
  )
  const [gainNode, setGainNode] = useState<GainNode | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  // const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  let iters = 1
  let totalRms = 0
  const rmsHistory = []

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke('greet', { name }))
    console.log('running greet')
  }

  async function logout() {
    await invoke('logout')
  }

  const getMusicFile = async () => {
    const path = await open({
      multiple: false,
      title: 'Select a music file',
      filters: [{ name: 'Music', extensions: ['mp3', 'wav'] }],
    })
    if (typeof path !== 'string') {
      return
    }
    setMusicFile(path)
  }
  const analyzeFile = async () => {
    // if (!musicFile) {
    //   return
    // }
    // console.log('opened: ', musicFile)
    // const blob = await readBinaryFile(musicFile)
    // console.log('blob', blob)
    // const audioContext = new AudioContext()
    // const gainNode = audioContext.createGain()
    // gainNode.gain.value = 0.25
    // gainNode.connect(audioContext.destination)
    // const soundBuffer = await audioContext.decodeAudioData(blob.buffer)
    // const audioSource = audioContext.createBufferSource()
    // audioSource.buffer = soundBuffer
    // // audioSource.connect(gainNode)
    // // audioSource.start()
    // const analyser = audioContext.createAnalyser()
    // analyser.fftSize = 2048
    // audioSource.connect(analyser)
    // analyser.connect(audioContext.destination)
    // const soundData = new Uint8Array(analyser.frequencyBinCount)
    // analyser.getByteFrequencyData(soundData)
    // console.log('soundData', soundData)
  }

  useEffect(() => {
    // Create a new AudioContext
    const context = new AudioContext()

    // Create a new AnalyserNode
    const analyserNode = context.createAnalyser()
    analyserNode.fftSize = 64 // Adjust this value as needed
    analyserNode.smoothingTimeConstant = 0.8 // Adjust this value as needed

    // Create a new Gain Node
    const gainNode = context.createGain()
    gainNode.gain.value = DEFAULT_VOLUME

    setAnalyser(analyserNode)
    setAudioContext(context)
    setGainNode(gainNode)

    return () => {
      context.close()
    }
  }, [])

  useEffect(() => {
    async function loadSoundFile() {
      if (!audioContext || !analyser || !musicFile || !gainNode) {
        return
      }
      setAnalyzing(true)
      const blob = await readBinaryFile(musicFile)
      const audioBuffer = await audioContext.decodeAudioData(blob.buffer)

      // Create a new AudioSourceNode
      const sourceNode = audioContext.createBufferSource()
      sourceNode.buffer = audioBuffer

      // Connect the source node to the analyser node
      sourceNode.connect(analyser)

      // Connect the analyser node to the destination (i.e. speakers or headphones)
      analyser.connect(gainNode)
      gainNode?.connect(audioContext.destination)

      setAudioSource(sourceNode)

      // Start playing the audio file
      sourceNode.start()
      setAnalyzing(false)
    }

    loadSoundFile()

    return () => {
      if (audioSource) {
        audioSource.stop()
      }
    }
  }, [audioContext, musicFile, analyser, gainNode])

  useEffect(() => {
    const analyzeFrequencyData = () => {
      if (!analyser) {
        return
      }

      const frequencyData = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(frequencyData)
      // setFrequencyData(frequencyData)

      if (frequencyData[0]) {
        iters++
      }
      const rms = Math.round(computeRms(frequencyData))
      totalRms += rms

      const avgRms = Math.round(totalRms / iters)
      console.log(
        iters,
        'rms',
        rms,
        'avg rms',
        avgRms,
        'z',
        (rms - avgRms) / avgRms
      )
    }

    const intervalId = setInterval(analyzeFrequencyData, 10)
    return () => clearInterval(intervalId)
  }, [analyser])

  // volume update
  useEffect(() => {
    if (!gainNode) return

    gainNode.gain.value = volume[0]
  }, [volume, gainNode])

  return (
    <div className=' flex flex-col justify-center items-center pt-10 bg-zinc-900 h-full w-full'>
      <h1 className='text-5xl text-zinc-300'>Welcome to Tauri!</h1>
      {analyzing && <p className='text-zinc-300'>Analyzing</p>}
      {/* {frequencyData && (
        <div className='text-slate-300'>
          RMS: {Math.round(computeRms(frequencyData))}
        </div>
      )}

      {frequencyData && (
        <div className='text-slate-300'>0: {frequencyData[0]}</div>
      )}
      {frequencyData && (
        <div className='text-slate-300'>
          l: {frequencyData[frequencyData.length - 1]}
        </div>
      )} */}

      <div className='btn-container'>
        <Button className='text-zinc-300' onClick={() => logout()}>
          Shut Down
        </Button>
        <Button onClick={() => getMusicFile()}>Select File</Button>
        <Button onClick={() => analyzeFile()}>Analyze file</Button>
      </div>
      <div className='flex items-center content-center flex-col'>
        <h2 className='text-3xl py-2 text-zinc-300'>Audio Stuff</h2>
        <Slider
          defaultValue={[DEFAULT_VOLUME]}
          max={1}
          min={0}
          step={0.01}
          onValueChange={(v) => setVolume(v)}
        />
        <div>Volume: {volume}</div>
        {musicFile ? (
          <p>Selected file: {musicFile}</p>
        ) : (
          <p>No file selected.</p>
        )}
        {/* {frequencyData && <BarEqualizer data={frequencyData} />}
        {frequencyData && <pre>{frequencyData.reverse().slice(0, 10)}</pre>} */}
      </div>
    </div>
  )
}
const BarEqualizer = ({
  data,
  height = 80,
}: {
  data: Uint8Array
  height?: number
}) => {
  const [bars, setBars] = useState<React.ReactNode[]>([])

  useEffect(() => {
    const newBars = []

    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * height + 5 // Scale bar height based on byte value
      let barColor
      if (data[i] > 200) {
        barColor = '#8f30a1'
      } else if (data[i] > 150) {
        barColor = '#fe4773'
      } else if (data[i] > 100) {
        barColor = '#f6d68d'
      } else if (data[i] > 50) {
        barColor = '#46b3a5'
      } else {
        barColor = '#2e6d92'
      }
      newBars.push(
        <div
          key={i}
          className='bar'
          style={{ height: `${barHeight}px`, backgroundColor: barColor }}
        />
      )
    }

    setBars(newBars)
  }, [data])

  return <div className='bar-container'>{bars}</div>
}

export default App
