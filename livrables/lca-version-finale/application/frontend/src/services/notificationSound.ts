type NotificationEvent={id?:string|null};
type Tone=()=>void|Promise<void>;

let audioContext:AudioContext|null=null,armed=false;
const playedIds=new Set<string>();
export const NOTIFICATION_TONE_DURATION_SECONDS=.8;

export function armNotificationSound(){try{const AudioContextClass=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!AudioContextClass)return;audioContext??=new AudioContextClass();void audioContext.resume().then(()=>{armed=true}).catch(()=>{})}catch{/* La politique audio du navigateur reste prioritaire. */}}
async function playTone(){if(!armed||!audioContext)return;const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;oscillator.type='sine';oscillator.frequency.setValueAtTime(660,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.05,now+.04);gain.gain.setValueAtTime(.05,now+.18);gain.gain.exponentialRampToValueAtTime(.0001,now+NOTIFICATION_TONE_DURATION_SECONDS);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+NOTIFICATION_TONE_DURATION_SECONDS)}

export function createNotificationSignal(tone:Tone=playTone){return{receive(event:NotificationEvent){const id=String(event?.id??'');if(!id||playedIds.has(id))return false;playedIds.add(id);if(playedIds.size>500)playedIds.delete(playedIds.values().next().value!);try{void Promise.resolve(tone()).catch(()=>{})}catch{}return true}}}
export const notificationSignal=createNotificationSignal();
export function resetNotificationSignalForTests(){playedIds.clear()}
