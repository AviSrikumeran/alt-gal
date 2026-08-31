import type { ComponentType } from 'react';
import type { ComponentType as AltComponentType, LibraryComponentProps } from '@/types/components';

export type LibraryComponent = ComponentType<LibraryComponentProps>;
export type ComponentRegistry = Record<AltComponentType, LibraryComponent>;

import Button from './Button';
import Card from './Card';
import Input from './Input';
import Textarea from './Textarea';
import Select from './Select';
import Toggle from './Toggle';
import Badge from './Badge';
import Avatar from './Avatar';
import Navbar from './Navbar';
import Hero from './Hero';
import PricingCard from './PricingCard';
import FeatureGrid from './FeatureGrid';
import Footer from './Footer';
import Modal from './Modal';
import Toast from './Toast';
import Accordion from './Accordion';

export const COMPONENT_REGISTRY: ComponentRegistry = {
  button: Button,
  card: Card,
  input: Input,
  textarea: Textarea,
  select: Select,
  toggle: Toggle,
  badge: Badge,
  avatar: Avatar,
  navbar: Navbar,
  hero: Hero,
  'pricing-card': PricingCard,
  'feature-grid': FeatureGrid,
  footer: Footer,
  modal: Modal,
  toast: Toast,
  accordion: Accordion,
};
