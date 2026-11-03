---
name: marketdatafeed-protocol
description: Reference for decoding the Kotak market-data binary protocol used by the trading platform, including packet structure, field mappings, and common example payloads.
---

# Market data feed protocol skill

Use this skill when working with the market data feed parser in this workspace, especially when debugging packet parsing, understanding binary field layouts, or explaining how the parser turns raw bytes into JSON objects.

## What this covers

- Packet-level structure for connection, subscription, snapshot, and update messages
- Byte-level parsing rules for long, float, and string values
- Topic model behavior for scrip, index, and depth feeds
- Field mapping tables used to build the final output object
- Common sample payload patterns and expected output objects

## Primary files

- [dist/marketdatafeed/protocol/PacketParser.js](dist/marketdatafeed/protocol/PacketParser.js)
- [dist/marketdatafeed/utils/binary.js](dist/marketdatafeed/utils/binary.js)
- [dist/marketdatafeed/constants/mappings.js](dist/marketdatafeed/constants/mappings.js)
- [dist/marketdatafeed/models/TopicData.js](dist/marketdatafeed/models/TopicData.js)
- [dist/marketdatafeed/PROTOCOL.md](dist/marketdatafeed/PROTOCOL.md)

## How to use this skill

When investigating a protocol issue:

1. Read the packet parser implementation first.
2. Check the binary helper functions for decoding rules.
3. Map the field indexes through the constants and mappings files.
4. Compare the incoming payload with the sample patterns in the protocol reference.

## Common parser concepts

- Response type `83` means snapshot.
- Response type `85` means update.
- Topic types are `sf` for scrip, `if` for index, and `dp` for depth.
- The parser stores raw values in a field array and then emits a normalized JSON object using mapping tables.
- Derived fields such as change, percentage change, and turnover are calculated in the topic data classes.

## Quick checklist for debugging

- Confirm the response type at the packet header.
- Check the topic id and topic name.
- Identify whether the payload is a snapshot or an update.
- Determine which numeric fields are present and which string fields are present.
- Use the mapping tables to translate field indexes into output keys.
