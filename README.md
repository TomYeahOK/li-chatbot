# Leeds Inspired chatbot - proof of concept
Proof-of-concept of a fb bot for navigating [Leeds Inspired](http://leedsinspired.co.uk) [data](https://api.leedsinspired.co.uk).

## Features
- User can mention what ‘genre’ they are interested in, and system lists events in that genre.
- User can filter by 2-genres. e.g. if there are too many ‘Gigs’, they can filter for things that are tagged as ‘Gigs’ AND ‘Jazz’.
- User can see the genres associated with an event, and find more events in that genre.
- System welcomes users (who say hi|hello|yo) by listing some popular genres, to help them get started.


## Limitations of the demo
- Does not do any filtering by date or location
- No recording of user preferences (i.e. no ability for user to set preferences for the system to remember)
- LI data does not contain canonical urls, therefore events can’t link to the respective pages on LI.


### Notes
- Currently served on infrastructure (gomix) that sleeps when inactive, therefore initial requests after sleep are laggy while the data is fetched, cached, and parsed.