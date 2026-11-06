import { z } from 'zod';

const publisherSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
  })
  .passthrough();

const pluginSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    version: z.string().optional(),
    dbName: z.string().optional(),
    dbDescription: z.string().optional(),
    dbVersion: z.string().optional(),
    navVersion: z.string().optional(),
    publisher: publisherSchema.optional(),
  })
  .passthrough();

export const specSchema = z
  .object({
    schemaVersion: z.literal(1),
    key: z.string(),
    plugin: pluginSchema,
    tables: z.array(z.record(z.unknown())).default([]),
    pages: z.array(z.record(z.unknown())).default([]),
    navigation: z.array(z.record(z.unknown())).default([]),
    powerQueries: z.array(z.record(z.unknown())).default([]),
    wildcards: z.array(z.record(z.unknown())).default([]),
    messageKeys: z.array(z.record(z.unknown())).default([]),
    rawFiles: z.array(z.record(z.unknown())).default([]),
    accessRequest: z.array(z.record(z.unknown())).default([]),
    permissionMappings: z.array(z.record(z.unknown())).default([]),
  })
  .passthrough();

export type ParsedSpec = z.infer<typeof specSchema>;
