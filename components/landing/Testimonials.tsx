"use client";

import { motion } from 'motion/react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Carlos Silva',
    location: 'São Paulo, SP',
    role: 'Colecionador há 15 anos',
    avatar: '🇧🇷',
    rating: 5,
    text: 'Melhor app para gerenciar minha coleção! Em 2 semanas consegui 90% do álbum através das trocas inteligentes.',
    highlight: 'Em 2 semanas consegui 90% do álbum'
  },
  {
    name: 'Ana Costa',
    location: 'Rio de Janeiro, RJ',
    role: 'Primeira Copa colecionando',
    avatar: '⚽',
    rating: 5,
    text: 'Nunca tinha colecionado figurinhas antes. O app é tão fácil de usar que em poucos dias já estava trocando com pessoas do mundo todo!',
    highlight: 'Tão fácil de usar'
  },
  {
    name: 'Pedro Santos',
    location: 'Belo Horizonte, MG',
    role: 'Pai de 2 colecionadores',
    avatar: '👨‍👧‍👦',
    rating: 5,
    text: 'Meus filhos adoraram! Encontramos vários colecionadores próximos para trocar pessoalmente. A comunidade é incrível!',
    highlight: 'A comunidade é incrível'
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-green-50 to-transparent opacity-50" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-full text-sm mb-4"
          >
            Depoimentos
          </motion.div>
          <h2 className="text-4xl md:text-5xl mb-4 text-gray-900">
            O que dizem nossos{' '}
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              colecionadores
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            Milhares de pessoas já completaram seus álbuns com a gente
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 h-full relative overflow-hidden">
                {/* Quote icon */}
                <motion.div
                  className="absolute top-6 right-6 opacity-5 group-hover:opacity-10 transition-opacity"
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                >
                  <Quote className="w-20 h-20" />
                </motion.div>

                {/* Rating stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    </motion.div>
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-gray-700 mb-6 leading-relaxed relative z-10">
                  "{testimonial.text}"
                </p>

                {/* Highlight */}
                <div className="bg-green-50 border-l-4 border-green-600 rounded px-4 py-3 mb-6">
                  <p className="text-sm text-green-800 italic">
                    {testimonial.highlight}
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center text-3xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.location}</div>
                    <div className="text-xs text-green-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-full px-8 py-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400 -ml-1 first:ml-0" />
              ))}
            </div>
            <div className="text-gray-700">
              <span className="font-semibold">4.9/5</span> baseado em{' '}
              <span className="font-semibold">12.482 avaliações</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
