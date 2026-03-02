import ModelCard from './ModelCard';

const models = [
  {
    title: 'Sneaker',
    subtitle: 'Core Everyday',
    modelSrc: '/models/shoe.glb',
    description: 'Daily comfort silhouette for all-round wear.',
  },
  {
    title: 'Formal',
    subtitle: 'Office Collection',
    modelSrc: '/models/formal.glb',
    description: 'Clean formal profile for business and occasion looks.',
  },
  {
    title: 'Running',
    subtitle: 'Performance Line',
    modelSrc: '/models/court.glb',
    description: 'Lightweight build focused on speed and repeat miles.',
  },
  {
    title: 'Sport',
    subtitle: 'All-round Active',
    modelSrc: '/models/trail.glb',
    description: 'Supportive shape tuned for training and active movement.',
  },
];

export default function ThreeDViewSection({
  title = '3D View',
  description = 'Explore all ShoesX models in interactive 3D.',
  className = '',
}) {
  return (
    <section id="three-d-view" className={`space-y-4 ${className}`.trim()}>
      <div className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-cyan-100">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {models.map((model) => (
          <ModelCard
            key={model.modelSrc}
            title={model.title}
            subtitle={model.subtitle}
            modelSrc={model.modelSrc}
            description={model.description}
          />
        ))}
      </div>
    </section>
  );
}
