import { describe, expect, it } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import { attachmentErrorText, imageSizeText } from '../src/client/image-labels.ts'
import { en } from '../src/client/locales.ts'

const t = makeTranslate(en, commonEn)
const enT = makeTranslate(en, commonEn)

describe('attachment rejection copy', () => {
  const limits = {
    maxImageBytes: 5 * 1024 * 1024,
    maxImagesPerMessage: 20,
    maxMessageImageBytes: 100 * 1024 * 1024,
    maxImagePixels: 40_000_000,
    maxImageDimension: 2000,
    mediaTypes: ['image/png'] as const,
  }

  it('renders megabytes without a trailing fraction unless one exists', () => {
    expect(imageSizeText(10 * 1024 * 1024)).toBe('10MB')
    expect(imageSizeText(2.5 * 1024 * 1024)).toBe('2.5MB')
  })

  it('maps user-solvable reasons to limit-naming copy', () => {
    expect(attachmentErrorText(t, 'MODEL_DOES_NOT_SUPPORT_IMAGES')).toBe('The current model does not support images; switch to a model that does')
    expect(attachmentErrorText(t, 'IMAGE_TOO_MANY_PIXELS')).toBe('Image resolution is too high; compress it and try again')
    expect(attachmentErrorText(t, 'INVALID_IMAGE')).toBe('Only PNG, JPG, WebP, and GIF images are supported')
    expect(attachmentErrorText(t, 'IMAGE_TYPE_MISMATCH')).toBe('Only PNG, JPG, WebP, and GIF images are supported')
    expect(attachmentErrorText(t, 'TOO_MANY_IMAGES', limits)).toBe('A message can include up to 20 images')
    expect(attachmentErrorText(t, 'IMAGE_TOO_LARGE', limits)).toBe('Each image must be smaller than 5MB')
    expect(attachmentErrorText(t, 'IMAGES_TOO_LARGE', limits)).toBe('Images exceed 100MB in total; remove some and try again')
    expect(attachmentErrorText(t, 'IMAGE_DIMENSION_TOO_LARGE', limits)).toBe('Image sides must be at most 2000px; downscale it and try again')
    expect(attachmentErrorText(enT, 'TOO_MANY_IMAGES', limits)).toBe('A message can include up to 20 images')
  })

  it('folds unknown reasons and limit reasons without projected limits into the send-failed line', () => {
    expect(attachmentErrorText(t, 'INVALID_IMAGE_BASE64')).toBe('Sending images failed (INVALID_IMAGE_BASE64); re-add them and try again')
    expect(attachmentErrorText(t, 'TOO_MANY_IMAGES')).toBe('Sending images failed (TOO_MANY_IMAGES); re-add them and try again')
    expect(attachmentErrorText(t, 'IMAGE_TOO_LARGE')).toBe('Sending images failed (IMAGE_TOO_LARGE); re-add them and try again')
    expect(attachmentErrorText(t, 'IMAGES_TOO_LARGE')).toBe('Sending images failed (IMAGES_TOO_LARGE); re-add them and try again')
    expect(attachmentErrorText(t, 'IMAGE_DIMENSION_TOO_LARGE')).toBe('Sending images failed (IMAGE_DIMENSION_TOO_LARGE); re-add them and try again')
  })
})
