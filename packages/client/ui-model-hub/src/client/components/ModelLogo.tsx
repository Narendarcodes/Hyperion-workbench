import React from 'react'
import css from './ModelLogo.module.css'

export interface ModelLogoProps {
  name: string
  architecture?: string
  family?: string
  size?: number
}

export interface ModelLogoInfo {
  family: string
  assetPath: string
  attribution: string
}

export function getModelLogoInfo(name: string, architecture = '', family = ''): ModelLogoInfo {
  const identifier = `${name} ${architecture} ${family}`.toLowerCase()

  if (identifier.includes('qwen')) {
    return {
      family: 'Qwen',
      assetPath: '/model-logos/qwen.svg',
      attribution: 'Alibaba Cloud Qwen Team (Official Family Asset)',
    }
  }

  if (identifier.includes('gemma')) {
    return {
      family: 'Gemma',
      assetPath: '/model-logos/gemma.svg',
      attribution: 'Google DeepMind Gemma Team (Official Family Asset)',
    }
  }

  if (identifier.includes('llama')) {
    return {
      family: 'Llama',
      assetPath: '/model-logos/llama.svg',
      attribution: 'Meta AI Llama Team (Official Family Asset)',
    }
  }

  if (identifier.includes('deepseek') || identifier.includes('r1')) {
    return {
      family: 'DeepSeek',
      assetPath: '/model-logos/deepseek.svg',
      attribution: 'DeepSeek AI Team (Official Family Asset)',
    }
  }

  if (identifier.includes('glm') || identifier.includes('ocr')) {
    return {
      family: 'GLM',
      assetPath: '/model-logos/glm.svg',
      attribution: 'Zhipu AI / THUDM (Official Family Asset)',
    }
  }

  if (identifier.includes('nomic') || identifier.includes('embed')) {
    return {
      family: 'Nomic',
      assetPath: '/model-logos/nomic.svg',
      attribution: 'Nomic AI Team (Official Family Asset)',
    }
  }

  if (identifier.includes('mistral') || identifier.includes('mixtral')) {
    return {
      family: 'Mistral',
      assetPath: '/model-logos/mistral.svg',
      attribution: 'Mistral AI Team (Official Family Asset)',
    }
  }

  if (identifier.includes('phi')) {
    return {
      family: 'Phi',
      assetPath: '/model-logos/phi.svg',
      attribution: 'Microsoft Research Phi Team (Official Family Asset)',
    }
  }

  if (identifier.includes('whisper')) {
    return {
      family: 'Whisper',
      assetPath: '/model-logos/whisper.svg',
      attribution: 'OpenAI Whisper Team (Official Family Asset)',
    }
  }

  if (identifier.includes('bge')) {
    return {
      family: 'BGE',
      assetPath: '/model-logos/bge.svg',
      attribution: 'BAAI BGE Embeddings Team (Official Family Asset)',
    }
  }

  return {
    family: 'Generic Model',
    assetPath: '/model-logos/default-model.svg',
    attribution: 'HYPERION Default Sovereign Model Asset',
  }
}

export const ModelLogo: React.FC<ModelLogoProps> = ({
  name,
  architecture = '',
  family = '',
  size = 48,
}) => {
  const logoInfo = getModelLogoInfo(name, architecture, family)
  const containerStyle = { width: size, height: size, minWidth: size, minHeight: size }

  return (
    <div className={css.logoContainer} style={containerStyle} title={`${logoInfo.family} Model Family`}>
      <img
        src={logoInfo.assetPath}
        alt={`${logoInfo.family} logo`}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => {
          // Inline SVG fallback if local file path cannot be fetched in specific test runners
          e.currentTarget.style.display = 'none'
          const parent = e.currentTarget.parentElement
          if (parent && !parent.querySelector('svg')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            svg.setAttribute('width', '24')
            svg.setAttribute('height', '24')
            svg.setAttribute('viewBox', '0 0 24 24')
            svg.setAttribute('fill', 'none')
            svg.setAttribute('stroke', '#0284C7')
            svg.setAttribute('stroke-width', '2')
            svg.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6v6H9z"/>'
            parent.appendChild(svg)
          }
        }}
      />
    </div>
  )
}
