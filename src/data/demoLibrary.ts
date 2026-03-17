import { PaperAnalysis } from '../types';

export const demoLibrary: PaperAnalysis[] = [
  {
    id: 'demo-attention-is-all-you-need',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
    year: '2017',
    journal: 'NeurIPS',
    summary:
      'Introduced the Transformer architecture and showed that attention-only sequence modeling can outperform recurrent approaches on major translation benchmarks.',
    uniqueFindings: [
      'Demonstrated that self-attention can replace recurrence for sequence transduction tasks.',
      'Reduced training costs while improving parallelism on modern hardware.',
      'Established the architectural foundation for later large language models.',
    ],
    gaps: [
      'Long-context efficiency and memory scaling were not yet fully solved.',
      'The paper focused on benchmark translation tasks rather than broad multimodal reasoning.',
    ],
    futureDirections: [
      'Study more efficient attention mechanisms for longer documents.',
      'Adapt the architecture to additional domains such as vision and multimodal learning.',
    ],
    tags: ['Transformers', 'Attention', 'Sequence Modeling', 'Foundation Models'],
    doi: '10.5555/3295222.3295349',
    url: 'https://papers.neurips.cc/paper/7181-attention-is-all-you-need',
    source: 'demo',
    citationCount: 0,
  },
  {
    id: 'demo-bert',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
    year: '2019',
    journal: 'NAACL-HLT',
    summary:
      'Presented bidirectional transformer pretraining with masked language modeling and next sentence prediction, producing strong gains across many NLP tasks.',
    uniqueFindings: [
      'Showed that large-scale pretraining followed by lightweight task fine-tuning is highly effective.',
      'Improved performance on question answering, natural language inference, and classification benchmarks.',
      'Made transfer learning a central pattern in NLP system design.',
    ],
    gaps: [
      'Fine-tuning sensitivity and compute requirements remained significant.',
      'Model interpretability and bias mitigation were not fully addressed.',
    ],
    futureDirections: [
      'Explore more efficient pretraining objectives and smaller deployable variants.',
      'Evaluate fairness, robustness, and domain adaptation more systematically.',
    ],
    tags: ['Transformers', 'NLP', 'Pretraining', 'Language Models'],
    doi: '10.18653/v1/N19-1423',
    url: 'https://aclanthology.org/N19-1423/',
    source: 'demo',
    citationCount: 0,
  },
  {
    id: 'demo-clip',
    title: 'Learning Transferable Visual Models From Natural Language Supervision',
    authors: ['Alec Radford', 'Jong Wook Kim', 'Chris Hallacy', 'Aditya Ramesh'],
    year: '2021',
    journal: 'ICML',
    summary:
      'CLIP aligned images and text in a shared embedding space using large-scale web supervision, enabling strong zero-shot transfer across many vision tasks.',
    uniqueFindings: [
      'Demonstrated zero-shot image classification at useful scale without task-specific training.',
      'Showed that language supervision can act as a flexible interface for vision systems.',
      'Expanded the practical scope of multimodal foundation models.',
    ],
    gaps: [
      'Web-scale supervision can introduce dataset bias and weak label noise.',
      'Fine-grained reasoning and safety behavior remain hard to guarantee.',
    ],
    futureDirections: [
      'Improve multimodal grounding and evaluation beyond zero-shot classification.',
      'Reduce bias and improve transparency in large web-supervised systems.',
    ],
    tags: ['Vision-Language', 'Multimodal AI', 'Zero-Shot Learning', 'Foundation Models'],
    doi: '10.48550/arXiv.2103.00020',
    url: 'https://proceedings.mlr.press/v139/radford21a.html',
    source: 'demo',
    citationCount: 0,
  },
  {
    id: 'demo-flan-palm',
    title: 'Scaling Instruction-Finetuned Language Models',
    authors: ['Hyung Won Chung', 'Le Hou', 'Sharan Narang', 'Yi Tay'],
    year: '2022',
    journal: 'JMLR',
    summary:
      'Studied instruction tuning at scale and showed that broad task mixtures can substantially improve zero-shot and few-shot generalization in large language models.',
    uniqueFindings: [
      'Instruction tuning improved usability across many downstream tasks.',
      'Scaling both the base model and the instruction corpus amplified gains.',
      'Helped popularize prompt-driven general-purpose language assistants.',
    ],
    gaps: [
      'Instruction-following quality still depends heavily on data coverage and evaluation design.',
      'Alignment, hallucination control, and reliability remain open challenges.',
    ],
    futureDirections: [
      'Refine instruction datasets and evaluation suites for real-world behavior.',
      'Combine instruction tuning with stronger retrieval and grounding methods.',
    ],
    tags: ['Instruction Tuning', 'LLMs', 'Prompting', 'Language Models'],
    doi: '10.48550/arXiv.2210.11416',
    url: 'https://jmlr.org/papers/v25/23-0870.html',
    source: 'demo',
    citationCount: 0,
  },
  {
    id: 'demo-rag',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: ['Patrick Lewis', 'Ethan Perez', 'Aleksandara Piktus', 'Fabio Petroni'],
    year: '2020',
    journal: 'NeurIPS',
    summary:
      'Combined parametric language models with neural retrieval so generated answers can draw on external knowledge at inference time.',
    uniqueFindings: [
      'Improved factual QA and knowledge-intensive generation with retrieval at run time.',
      'Created a template for grounding language models in external sources.',
      'Influenced later assistant architectures that separate memory from generation.',
    ],
    gaps: [
      'Retriever quality and indexing freshness strongly affect answer quality.',
      'Faithful citation and provenance tracking were still limited.',
    ],
    futureDirections: [
      'Improve retrieval quality, citation faithfulness, and source attribution.',
      'Explore hybrid pipelines that combine retrieval, ranking, and generation.',
    ],
    tags: ['Retrieval', 'RAG', 'Knowledge Systems', 'Language Models'],
    doi: '10.48550/arXiv.2005.11401',
    url: 'https://papers.nips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html',
    source: 'demo',
    citationCount: 0,
  },
];
