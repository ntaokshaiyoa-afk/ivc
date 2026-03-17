import type { Job } from '@/domain/job/types'
import { ImageJobCard } from './ImageJobCard'
import { VideoJobCard } from './VideoJobCard'

type Props = {
  job: Job
  onChangeSettings: (jobId: string, patch: Record<string, any>) => void
  onRecompress: (jobId: string) => void
  onRecompressLatest: (jobId: string) => void
  onOpenImageModal: (before: string, after: string) => void
}

export function JobCard(props: Props) {
  const { job } = props

  if (job.processorId === 'image') {
    return (
      <ImageJobCard
        job={job}
        onChangeSettings={props.onChangeSettings}
        onRecompressLatest={props.onRecompressLatest}
        onOpenImageModal={props.onOpenImageModal}
      />
    )
  }

  if (job.processorId === 'video') {
    return (
      <VideoJobCard
        job={job}
        onChangeSettings={props.onChangeSettings}
        onRecompress={() => props.onRecompress(job.id)}
      />
    )
  }

  return null
}
