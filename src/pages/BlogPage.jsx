const posts = [
  {
    title: 'How to Pick Running Shoes for Daily Training',
    snippet: 'Focus on cushioning balance, stride comfort, and outsole grip for your weekly mileage.',
  },
  {
    title: 'AI Fit Scores: What They Mean for Comfort',
    snippet: 'Fit confidence helps compare sizing patterns and reduce trial-and-return cycles.',
  },
  {
    title: 'Shoe Care Basics: Keep Sneakers Fresh Longer',
    snippet: 'Simple rotation and cleaning routines can preserve both structure and appearance.',
  },
];

export default function BlogPage() {
  return (
    <div className="space-y-6">
      <section className="panel bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <h1 className="text-3xl font-bold">ShoesX Blog</h1>
        <p className="mt-2 text-sm text-cyan-100">Updates, buying guides, and fit-focused footwear tips.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <article key={post.title} className="panel h-full">
            <h2 className="text-lg font-semibold">{post.title}</h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{post.snippet}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
