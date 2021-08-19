/* FILENAME:    FontAwesomeIcons.tsx
 * DESCRIPTION: 
 *      This file imports the 6 camera control icons into one file
 * DATE:    08/19/2021
 * AUTHOR:      Teagan Johnson   Aaron Bauer    Katrina Li
 */
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { faSearchMinus, faSearchPlus, faRedo, faUndo, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';

library.add(fab, faSearchMinus, faSearchPlus, faRedo, faUndo, faArrowUp, faArrowDown);