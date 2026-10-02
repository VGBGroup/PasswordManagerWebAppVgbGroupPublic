import LottieImport from 'lottie-react'
const Lottie = (LottieImport as any).default || LottieImport
import loading from '../../assets/svg/loading.json'

interface LoadingProps {
  size?: number;
}


export default function Loading({ size = 24 }: LoadingProps) {
  return (
    <Lottie
      animationData={loading}
      loop
      style={{ width: size, height: size }}
    />
  );
}