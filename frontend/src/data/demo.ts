import type { SelectedMedia, StudyNotes, TranscriptSegment } from "../types";

export const demoMedia: SelectedMedia = {
  name: "Neural_Networks_Lecture.mp3",
  sizeLabel: "38.4 MB",
  durationLabel: "48:12",
  isDemo: true,
};

export const demoTranscript: TranscriptSegment[] = [
  {
    id: "segment-1",
    time: "00:00",
    seconds: 0,
    text: "Today we are going to build an intuitive understanding of neural networks, beginning with the role of individual neurons and ending with how a model learns from error.",
  },
  {
    id: "segment-2",
    time: "03:18",
    seconds: 198,
    text: "A neuron receives input values, applies a weight to each one, adds a bias, and passes the result through an activation function. The weights determine which signals matter most.",
  },
  {
    id: "segment-3",
    time: "09:42",
    seconds: 582,
    text: "Activation functions introduce non-linearity. Without them, stacking many layers would still behave like a single linear transformation and could not represent complex patterns.",
  },
  {
    id: "segment-4",
    time: "16:05",
    seconds: 965,
    text: "During a forward pass, data moves from the input layer through the hidden layers to produce a prediction. We compare that prediction with the correct answer using a loss function.",
  },
  {
    id: "segment-5",
    time: "23:27",
    seconds: 1407,
    text: "Backpropagation applies the chain rule to calculate how much each parameter contributed to the error. Those gradients tell us the direction in which each weight should change.",
  },
  {
    id: "segment-6",
    time: "31:14",
    seconds: 1874,
    text: "Gradient descent updates the parameters in the opposite direction of the gradient. The learning rate controls the size of each update, so choosing it requires balance.",
  },
  {
    id: "segment-7",
    time: "38:51",
    seconds: 2331,
    text: "Overfitting happens when a network memorizes training examples instead of learning patterns that generalize. Validation data, dropout, and regularization help us detect or reduce it.",
  },
  {
    id: "segment-8",
    time: "46:20",
    seconds: 2780,
    text: "The full training loop is therefore a cycle: make a prediction, measure the loss, propagate the error backward, update the parameters, and evaluate on unseen data.",
  },
];

export const demoNotes: StudyNotes = {
  title: "Neural Networks — Foundations",
  summary:
    "Neural networks learn complex patterns by passing inputs through layers of weighted neurons and iteratively correcting prediction errors. Training combines forward propagation, a loss function, backpropagation, and gradient descent, while validation and regularization help the model generalize.",
  keyConcepts: [
    {
      term: "Artificial neuron",
      explanation: "Combines weighted inputs and a bias before applying an activation function.",
      sourceSegmentId: "segment-2",
      importance: 5,
    },
    {
      term: "Activation function",
      explanation: "Adds the non-linearity needed to model complex relationships.",
      sourceSegmentId: "segment-3",
      importance: 5,
    },
    {
      term: "Forward propagation",
      explanation: "Moves input data through the network to produce a prediction.",
      sourceSegmentId: "segment-4",
      importance: 4,
    },
    {
      term: "Backpropagation",
      explanation: "Uses the chain rule to assign error contribution to each parameter.",
      sourceSegmentId: "segment-5",
      importance: 5,
    },
    {
      term: "Gradient descent",
      explanation: "Updates parameters in the direction that reduces the loss.",
      sourceSegmentId: "segment-6",
      importance: 4,
    },
    {
      term: "Overfitting",
      explanation: "Occurs when training performance improves without generalization.",
      sourceSegmentId: "segment-7",
      importance: 4,
    },
  ],
  importantDetails: [
    "Weights control the influence of each input signal.",
    "A bias shifts the activation threshold of a neuron.",
    "The learning rate determines the size of parameter updates.",
    "Validation data estimates performance on unseen examples.",
    "Dropout and regularization can reduce overfitting.",
  ],
  studyQuestions: [
    {
      question: "What role does a weight play in an artificial neuron?",
      difficulty: "easy",
    },
    {
      question: "Why does a deep network need non-linear activation functions?",
      difficulty: "easy",
    },
    {
      question: "How do forward propagation and a loss function work together?",
      difficulty: "medium",
    },
    {
      question: "Explain how the chain rule makes backpropagation possible.",
      difficulty: "medium",
    },
    {
      question: "How would you diagnose and respond to an overfitting model?",
      difficulty: "hard",
    },
  ],
};
